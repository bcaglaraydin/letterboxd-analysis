include "root" {
  path = find_in_parent_folders()
}

include "common" {
  path = "${get_terragrunt_dir()}/../../common-lambda.hcl"
}

terraform {
  source = "../../../../modules/lambda"
}

dependency "films" {
  config_path = "../../dynamodb/films"
}

dependency "deployment_bucket" {
  config_path = "../../lambda-deployment-bucket"
}

dependency "sqs" {
  config_path = "../../sqs"
}

dependency "sqs_list" {
  config_path = "../../sqs-list"
}

dependency "user_jobs" {
  config_path = "../../dynamodb/user-jobs"
}

inputs = {
  function_name = "letterboxd-analysis-start-dev"
  handler       = "src/handlers/startAnalysisHandler.handler"
  memory_size   = 2048
  timeout       = 300
  source_dir    = "${get_terragrunt_dir()}/../../../../../backend"
  deployment_bucket = dependency.deployment_bucket.outputs.bucket_name

  environment_variables = {
    NODE_ENV          = "development"
    FILMS_TABLE       = dependency.films.outputs.table_name
    USER_JOBS_TABLE   = dependency.user_jobs.outputs.table_name
    SQS_QUEUE_URL     = dependency.sqs.outputs.queue_url
    SQS_LIST_QUEUE_URL = dependency.sqs_list.outputs.queue_url
    BROWSER_MAX_PAGES = "5"
    SCRAPING_CONCURRENCY_LIST = "2"
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
      },
      {
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem"
        ]
        Effect   = "Allow"
        Resource = dependency.user_jobs.outputs.table_arn
      },
      {
        Action   = "sqs:SendMessage"
        Effect   = "Allow"
        Resource = [
            dependency.sqs.outputs.queue_arn,
            dependency.sqs_list.outputs.queue_arn
        ]
      }
    ]
  })
}
