include "root" {
  path = find_in_parent_folders()
}

include "common" {
  path = "${get_terragrunt_dir()}/../common-lambda.hcl"
}

terraform {
  source = "../../../modules/lambda"
}

dependency "sqs" {
  config_path = "../sqs"
}

dependency "films" {
  config_path = "../dynamodb/films"
}

inputs = {
  function_name = "letterboxd-analysis-worker-dev"
  handler       = "src/handlers/worker.handler"
  memory_size   = 1024
  timeout       = 300
  source_dir    = "${get_terragrunt_dir()}/../../../../backend"

  environment_variables = {
    NODE_ENV    = "development"
    FILMS_TABLE = dependency.films.outputs.table_name
  }

  sqs_event_source_arn = dependency.sqs.outputs.queue_arn

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
        ]
        Effect   = "Allow"
        Resource = dependency.films.outputs.table_arn
      }
    ]
  })
}
