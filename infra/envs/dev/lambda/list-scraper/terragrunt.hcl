include "root" {
  path = find_in_parent_folders()
}

include "common" {
  path = "${get_terragrunt_dir()}/../../common-lambda.hcl"
}

terraform {
  source = "../../../../modules/lambda"
}

dependency "sqs_list" {
  config_path = "../../sqs-list"
}

dependency "sqs_film" {
  config_path = "../../sqs"
}

dependency "films" {
  config_path = "../../dynamodb/films"
}

dependency "user_jobs" {
  config_path = "../../dynamodb/user-jobs"
}

dependency "deployment_bucket" {
  config_path = "../../lambda-deployment-bucket"
}

inputs = {
  function_name = "letterboxd-analysis-list-scraper-dev"
  handler       = "src/handlers/listScraperHandler.handler"
  memory_size   = 2048
  timeout       = 900 # 15 minutes max
  source_dir    = "${get_terragrunt_dir()}/../../../../../backend"
  deployment_bucket = dependency.deployment_bucket.outputs.bucket_name

  environment_variables = {
    NODE_ENV                  = "development"
    FILMS_TABLE               = dependency.films.outputs.table_name
    USER_JOBS_TABLE           = dependency.user_jobs.outputs.table_name
    SQS_QUEUE_URL             = dependency.sqs_film.outputs.queue_url
    BROWSER_MAX_PAGES         = "5"
    SCRAPING_CONCURRENCY_LIST = "5"
  }

  sqs_event_source_arn = dependency.sqs_list.outputs.queue_arn
  sqs_batch_size       = 1
  sqs_batch_window     = 0

  policy_arns = [
    "arn:aws:iam::aws:policy/service-role/AWSLambdaSQSQueueExecutionRole"
  ]

  inline_policy_json = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "dynamodb:BatchGetItem",
          "dynamodb:GetItem"
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
        Resource = dependency.sqs_film.outputs.queue_arn
      }
    ]
  })
}
