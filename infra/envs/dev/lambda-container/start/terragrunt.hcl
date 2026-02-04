include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../../modules/lambda-container"
}

dependency "films" {
  config_path = "../../dynamodb/films"
}

dependency "user_jobs" {
  config_path = "../../dynamodb/user-jobs"
}

dependency "sqs" {
  config_path = "../../sqs"
}

dependency "sqs_list" {
  config_path = "../../sqs-list"
}

dependency "ecr" {
  config_path = "../../ecr/start"
}

inputs = {
  function_name = "letterboxd-analysis-start-dev"
  image_uri     = "${dependency.ecr.outputs.repository_url}:${get_env("IMAGE_TAG", "latest")}"
  environment   = "dev"
  memory_size   = 2048
  timeout       = 300

  environment_variables = {
    NODE_ENV           = "development"
    FILMS_TABLE        = dependency.films.outputs.table_name
    USER_JOBS_TABLE    = dependency.user_jobs.outputs.table_name
    SQS_QUEUE_URL      = dependency.sqs.outputs.queue_url
    SQS_LIST_QUEUE_URL = dependency.sqs_list.outputs.queue_url
    BROWSER_MAX_PAGES  = "5"
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
