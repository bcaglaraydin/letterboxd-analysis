from diagrams import Diagram, Cluster, Edge
from diagrams.aws.compute import Lambda
from diagrams.aws.database import Dynamodb
from diagrams.aws.integration import SQS
from diagrams.aws.network import APIGateway
from diagrams.aws.management import Cloudwatch
from diagrams.aws.storage import S3
from diagrams.aws.compute import ECR
from diagrams.onprem.client import User
from diagrams.programming.framework import React

# ──────────────────────────────────────────────
# Visual Style (Minimal + Clean)
# ──────────────────────────────────────────────

SYNC = {"color": "#2D6A4F", "style": "bold"}      # Synchronous request flow
ASYNC = {"color": "#1D3557", "style": "bold"}     # Async processing
ERROR = {"color": "#D00000", "style": "dashed"}   # DLQ
OBS = {"color": "#888888", "style": "dotted"}     # Monitoring

graph_attr = {
    "fontsize": "26",
    "fontname": "Helvetica",
    "bgcolor": "white",
    "pad": "1.2",
    "splines": "ortho",
    "nodesep": "1.8",
    "ranksep": "2.0",
    "dpi": "160",
}

node_attr = {
    "fontsize": "11",
    "fontname": "Helvetica",
}

with Diagram(
    "Letterboxd Analysis — AWS Architecture",
    direction="LR",
    show=False,
    filename="docs/architecture",
    outformat="png",
    graph_attr=graph_attr,
    node_attr=node_attr,
):

    # ──────────────────────────────────────────
    # Client Layer
    # ──────────────────────────────────────────
    user = User("User")
    frontend = React("Next.js SPA\n(Vercel)")
    api = APIGateway("HTTP API")

    # ──────────────────────────────────────────
    # Compute Layer
    # ──────────────────────────────────────────
    with Cluster("Application Compute (AWS Lambda)"):
        start = Lambda("Start Analysis")
        status = Lambda("Check Status")
        list_scraper = Lambda("List Scraper\n(Chromium)")
        worker = Lambda("Film Worker\n(Chromium)")

    # ──────────────────────────────────────────
    # Messaging Layer
    # ──────────────────────────────────────────
    with Cluster("Asynchronous Processing (SQS)"):
        list_queue = SQS("List Queue")
        film_queue = SQS("Film Queue")
        list_dlq = SQS("List DLQ")
        film_dlq = SQS("Film DLQ")

    # ──────────────────────────────────────────
    # Data Layer
    # ──────────────────────────────────────────
    with Cluster("Persistence (DynamoDB)"):
        user_jobs = Dynamodb("User Jobs")
        films = Dynamodb("Films")

    # ──────────────────────────────────────────
    # Observability
    # ──────────────────────────────────────────
    with Cluster("Observability"):
        logs = Cloudwatch("CloudWatch Logs")
        alarms = Cloudwatch("CloudWatch Alarms")

    # ──────────────────────────────────────────
    # CI/CD (Separated Visually)
    # ──────────────────────────────────────────
    with Cluster("Container Registry"):
        ecr = ECR("ECR Repositories")
        tfstate = S3("Terraform State")

    # ════════════════════════════════════════════
    # Synchronous Flow
    # ════════════════════════════════════════════
    user >> Edge(label="HTTPS", **SYNC) >> frontend
    frontend >> Edge(label="API Requests", **SYNC) >> api
    api >> Edge(**SYNC) >> start
    api >> Edge(**SYNC) >> status

    start >> Edge(label="Read / Write", **SYNC) >> user_jobs
    start >> Edge(label="Read (ready)", **SYNC) >> films
    status >> Edge(label="Read", **SYNC) >> user_jobs
    status >> Edge(label="Read", **SYNC) >> films

    # ════════════════════════════════════════════
    # Async Pipeline
    # ════════════════════════════════════════════
    start >> Edge(label="Enqueue", **ASYNC) >> list_queue
    list_queue >> Edge(**ASYNC) >> list_scraper
    list_scraper >> Edge(label="Update Job", **ASYNC) >> user_jobs
    list_scraper >> Edge(label="Fan-out", **ASYNC) >> film_queue
    film_queue >> Edge(**ASYNC) >> worker
    worker >> Edge(label="Store Metadata", **ASYNC) >> films

    # DLQs
    list_queue >> Edge(**ERROR) >> list_dlq
    film_queue >> Edge(**ERROR) >> film_dlq

    # ════════════════════════════════════════════
    # Observability
    # ════════════════════════════════════════════
    start >> Edge(**OBS) >> logs
    status >> Edge(**OBS) >> logs
    list_scraper >> Edge(**OBS) >> logs
    worker >> Edge(**OBS) >> logs

    logs >> Edge(**OBS) >> alarms

    # CI/CD linkage (subtle)
    ecr >> Edge(**OBS) >> start
    ecr >> Edge(**OBS) >> status