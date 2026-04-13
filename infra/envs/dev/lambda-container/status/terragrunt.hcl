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

dependency "ecr" {
  config_path = "../../ecr/status"
}

dependency "cost_protection" {
  config_path = "../../cost-protection"
}

inputs = {
  function_name = "letterboxd-analysis-status-dev"
  image_uri     = "${dependency.ecr.outputs.repository_url}:${get_env("IMAGE_TAG", "latest")}"
  environment   = "dev"
  memory_size   = 256
  timeout       = 30

  environment_variables = {
    NODE_ENV        = "production"
    FILMS_TABLE     = dependency.films.outputs.table_name
    USER_JOBS_TABLE = dependency.user_jobs.outputs.table_name
    API_READ_ACCESS_TOKEN = get_env("API_READ_ACCESS_TOKEN", "")
  }

  policy_arns = [
    "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  ]

  inline_policy_json = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "dynamodb:GetItem",
          "dynamodb:BatchGetItem"
        ]
        Effect   = "Allow"
        Resource = dependency.films.outputs.table_arn
      },
      {
        Action = [
          "dynamodb:GetItem",
          "dynamodb:DeleteItem",
          "dynamodb:UpdateItem"
        ]
        Effect   = "Allow"
        Resource = dependency.user_jobs.outputs.table_arn
      },
      {
        Action = [
          "ssm:GetParameter"
        ]
        Effect   = "Allow"
        Resource = dependency.cost_protection.outputs.ssm_parameter_arn
      }
    ]
  })
}
