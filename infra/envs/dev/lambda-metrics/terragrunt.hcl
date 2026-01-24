include "root" {
  path = find_in_parent_folders()
}

include "common" {
  path = "${get_terragrunt_dir()}/../common-lambda.hcl"
}

terraform {
  source = "../../../modules/lambda"
}

dependency "films" {
  config_path = "../dynamodb/films"
}

dependency "deployment_bucket" {
  config_path = "../lambda-deployment-bucket"
}

inputs = {
  function_name = "letterboxd-analysis-metrics-dev"
  handler       = "src/handlers/retrieveMetricsHandler.handler"
  memory_size   = 2048
  timeout       = 300
  source_dir    = "${get_terragrunt_dir()}/../../../../backend"
  deployment_bucket = dependency.deployment_bucket.outputs.bucket_name

  environment_variables = {
    NODE_ENV    = "development"
    FILMS_TABLE = dependency.films.outputs.table_name
    SCRAPING_CONCURRENCY_LIST = "3"
    SCRAPING_CONCURRENCY_FILM = "5"
  }

  policy_arns = [
    "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  ]

  inline_policy_json = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "dynamodb:BatchGetItem",
          "dynamodb:GetItem",
          "dynamodb:BatchWriteItem",
          "dynamodb:PutItem"
        ]
        Effect   = "Allow"
        Resource = dependency.films.outputs.table_arn
      }
    ]
  })
}
