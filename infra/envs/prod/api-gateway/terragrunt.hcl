include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules/api-gateway"
}

dependency "lambda_start" {
  config_path = "../lambda-container/start"
}

dependency "lambda_status" {
  config_path = "../lambda-container/status"
}

dependency "cloudfront" {
  config_path = "../cloudfront"
}

inputs = {
  api_name = "letterboxd-analysis-api-prod"
  
  allow_origins = [
    "http://localhost:3000",
    "https://${dependency.cloudfront.outputs.cloudfront_domain_name}"
  ]

  throttling_rate_limit = 5
  throttling_burst_limit = 10

  integrations = {
    auth = {
      lambda_invoke_arn    = dependency.lambda_start.outputs.invoke_arn # Reuse start lambda for now or create new one?
      lambda_function_name = dependency.lambda_start.outputs.function_name
      route_key            = "GET /auth/token"
    }
    start = {
      lambda_invoke_arn    = dependency.lambda_start.outputs.invoke_arn
      lambda_function_name = dependency.lambda_start.outputs.function_name
      route_key            = "POST /analysis"
      timeout_milliseconds = 30000 
    }
    status = {
      lambda_invoke_arn    = dependency.lambda_status.outputs.invoke_arn
      lambda_function_name = dependency.lambda_status.outputs.function_name
      route_key            = "GET /analysis/status"
    }
  }
}
