include "root" {
  path = find_in_parent_folders()
}

include "common" {
  path = "${get_terragrunt_dir()}/../../common-lambda.hcl"
}

terraform {
  source = "../../../../modules/lambda"
}

# One-time imports for existing AWS resources after folder restructure
# Remove this block after successful first deployment
generate "imports" {
  path      = "imports.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
import {
  to = aws_iam_role.iam_for_lambda
  id = "letterboxd-analysis-worker-dev-role"
}

import {
  to = aws_cloudwatch_log_group.this
  id = "/aws/lambda/letterboxd-analysis-worker-dev"
}

import {
  to = aws_lambda_function.this
  id = "letterboxd-analysis-worker-dev"
}

import {
  to = aws_lambda_event_source_mapping.sqs[0]
  id = "ca059c1b-fef4-4bea-a33f-b4b641dbc3c5"
}
EOF
}

dependency "sqs" {
  config_path = "../../sqs"
}

dependency "films" {
  config_path = "../../dynamodb/films"
}

dependency "deployment_bucket" {
  config_path = "../../lambda-deployment-bucket"
}

inputs = {
  function_name = "letterboxd-analysis-worker-dev"
  handler       = "src/handlers/filmScraperWorker.handler"
  memory_size   = 2048
  timeout       = 300
  source_dir    = "${get_terragrunt_dir()}/../../../../../backend"
  deployment_bucket = dependency.deployment_bucket.outputs.bucket_name

  environment_variables = {
    NODE_ENV            = "development"
    FILMS_TABLE         = dependency.films.outputs.table_name
    SQS_QUEUE_URL       = dependency.sqs.outputs.queue_url
    BROWSER_MAX_PAGES   = "10"
    BROWSER_CONCURRENCY = "10"
  }

  sqs_event_source_arn = dependency.sqs.outputs.queue_arn
  sqs_batch_size       = 10
  sqs_batch_window     = 0

  policy_arns = [
    "arn:aws:iam::aws:policy/service-role/AWSLambdaSQSQueueExecutionRole"
  ]

  inline_policy_json = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "dynamodb:PutItem",
          "dynamodb:BatchWriteItem",
          "dynamodb:GetItem",
          "dynamodb:BatchGetItem"
        ]
        Effect   = "Allow"
        Resource = dependency.films.outputs.table_arn
      },
      {
        Action   = "sqs:SendMessage"
        Effect   = "Allow"
        Resource = dependency.sqs.outputs.queue_arn
      }
    ]
  })
}
