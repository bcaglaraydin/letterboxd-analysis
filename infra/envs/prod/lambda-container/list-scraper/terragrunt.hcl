include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../../modules/lambda-container"
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

dependency "ecr" {
  config_path = "../../../../shared/ecr/list-scraper"
}

inputs = {
  function_name = "letterboxd-analysis-list-scraper-prod"
  image_uri     = "${dependency.ecr.outputs.repository_url}:${get_env("IMAGE_TAG", "latest")}"
  environment   = "prod"
  memory_size   = 3008
  timeout       = 900 # 15 minutes max
  reserved_concurrent_executions = 2

  environment_variables = {
    NODE_ENV                  = "production"
    FILMS_TABLE               = dependency.films.outputs.table_name
    USER_JOBS_TABLE           = dependency.user_jobs.outputs.table_name
    SQS_QUEUE_URL             = dependency.sqs_film.outputs.queue_url
    SQS_LIST_QUEUE_URL        = dependency.sqs_list.outputs.queue_url
    BROWSER_MAX_PAGES         = "5"
    SCRAPING_CONCURRENCY_LIST = "2"
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
