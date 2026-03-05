from diagrams import Diagram, Cluster, Edge
from diagrams.aws.compute import Lambda
from diagrams.aws.database import Dynamodb
from diagrams.aws.integration import SQS
from diagrams.aws.network import APIGateway
from diagrams.onprem.client import User
from diagrams.programming.framework import React
from diagrams.generic.network import Firewall

# ──────────────────────────────────────────────
# Visual Style
# ──────────────────────────────────────────────

SYNC = {"color": "#1D3557", "style": "solid"}
ASYNC = {"color": "#1D3557", "style": "dashed"}
ERROR = {"color": "#E63946", "style": "dotted"}
EXT = {"color": "#6C757D", "style": "solid"}

graph_attr = {
    "fontsize": "24",
    "fontname": "Helvetica",
    "bgcolor": "white",
    "pad": "0.5",
    "splines": "ortho",
    "nodesep": "0.5",
    "ranksep": "1.0",
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
    # Client
    # ──────────────────────────────────────────
    user = User("User")
    frontend = React("Next.js SPA")
    api = APIGateway("HTTP API")

    # ──────────────────────────────────────────
    # Compute
    # ──────────────────────────────────────────
    with Cluster("Lambda Functions"):
        start = Lambda("Start Analysis")
        status = Lambda("Check Status")
        list_scraper = Lambda("List Scraper\n(Chromium)")
        worker = Lambda("Film Worker\n(Chromium)")

    # ──────────────────────────────────────────
    # Messaging
    # ──────────────────────────────────────────
    with Cluster("SQS Queues"):
        list_queue = SQS("List Queue")
        film_queue = SQS("Film Queue")
        list_dlq = SQS("List DLQ")
        film_dlq = SQS("Film DLQ")

    # 1. Main User Flow (Left to Right)
    user >> Edge(label="HTTPS", **SYNC) >> frontend
    frontend >> Edge(label="API", **SYNC) >> api
    
    with Cluster("Backend Pipeline"):
        with Cluster("Compute"):
            api >> Edge(**SYNC) >> start
            api >> Edge(**SYNC) >> status

            start >> Edge(label="Enqueue", **ASYNC) >> list_queue
            list_queue >> list_scraper
            list_scraper >> Edge(label="Fan-out", **ASYNC) >> film_queue
            film_queue >> worker

        with Cluster("Storage"):
            user_jobs = Dynamodb("User Jobs")
            films = Dynamodb("Films")

    # Critical State/Data Flow (Forward Only)
    start >> Edge(**SYNC, constraint="false") >> user_jobs
    list_scraper >> Edge(**SYNC, constraint="false") >> user_jobs
    worker >> Edge(**SYNC, constraint="false") >> films

    # 5. DLQs
    list_queue >> Edge(**ERROR) >> list_dlq
    film_queue >> Edge(**ERROR) >> film_dlq
