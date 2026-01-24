include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules/api-gateway"
}

dependency "lambda_scrape" {
  config_path = "../lambda"
}

dependency "lambda_metrics" {
  config_path = "../lambda-metrics"
}

inputs = {
  api_name = "letterboxd-analysis-api-dev"
  
  integrations = {
    scrape = {
      lambda_invoke_arn    = dependency.lambda_scrape.outputs.invoke_arn
      lambda_function_name = dependency.lambda_scrape.outputs.function_name
      route_key            = "POST /"
    }
    metrics = {
      lambda_invoke_arn    = dependency.lambda_metrics.outputs.invoke_arn
      lambda_function_name = dependency.lambda_metrics.outputs.function_name
      route_key            = "POST /metrics"
      timeout_milliseconds = 30000  # Max for HTTP API
    }
  }
}
