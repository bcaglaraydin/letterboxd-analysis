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

dependency "deployment_bucket" {
  config_path = "../lambda-deployment-bucket"
}

inputs = {
  function_name = "letterboxd-analysis-worker-dev"
  handler       = "src/handlers/processFilmMetadataHandler.handler"
  memory_size   = 1024
  timeout       = 300
  source_dir    = "${get_terragrunt_dir()}/../../../../backend"
  deployment_bucket = dependency.deployment_bucket.outputs.bucket_name

  environment_variables = {
    NODE_ENV                  = "development"
    FILMS_TABLE               = dependency.films.outputs.table_name
    SCRAPING_CONCURRENCY_LIST = "10"
    SCRAPING_CONCURRENCY_FILM = "10"
  }

  sqs_event_source_arn = dependency.sqs.outputs.queue_arn
  sqs_batch_size       = 100
  sqs_batch_window     = 5

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
