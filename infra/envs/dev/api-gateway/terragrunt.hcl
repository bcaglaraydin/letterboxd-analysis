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

inputs = {
  api_name = "letterboxd-analysis-api-dev"
  
  integrations = {
    start = {
      lambda_invoke_arn    = dependency.lambda_start.outputs.invoke_arn
      lambda_function_name = dependency.lambda_start.outputs.function_name
      route_key            = "POST /analysis"
      timeout_milliseconds = 30000  # Max for HTTP API
    }
    status = {
      lambda_invoke_arn    = dependency.lambda_status.outputs.invoke_arn
      lambda_function_name = dependency.lambda_status.outputs.function_name
      route_key            = "GET /analysis/status"
    }
  }
}
