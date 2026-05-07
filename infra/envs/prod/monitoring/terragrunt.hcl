include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "../../../modules/monitoring"
}

dependency "lambda_start" {
  config_path = "../lambda-container/start"
}

dependency "lambda_status" {
  config_path = "../lambda-container/status"
}

dependency "lambda_worker" {
  config_path = "../lambda-container/worker"
}

dependency "lambda_list_scraper" {
  config_path = "../lambda-container/list-scraper"
}

dependency "api_gateway" {
  config_path = "../api-gateway"
}

dependency "sqs" {
  config_path = "../sqs"
}

dependency "sqs_list" {
  config_path = "../sqs-list"
}

inputs = {
  lambdas = {
    start = {
      function_name = dependency.lambda_start.outputs.function_name
      timeout       = dependency.lambda_start.outputs.timeout
    }
    status = {
      function_name = dependency.lambda_status.outputs.function_name
      timeout       = dependency.lambda_status.outputs.timeout
    }
    worker = {
      function_name = dependency.lambda_worker.outputs.function_name
      timeout       = dependency.lambda_worker.outputs.timeout
    }
    list_scraper = {
      function_name = dependency.lambda_list_scraper.outputs.function_name
      timeout       = dependency.lambda_list_scraper.outputs.timeout
    }
  }
  api_gateway_names = [dependency.api_gateway.outputs.api_name]
  sqs_queue_names   = [dependency.sqs.outputs.queue_name, dependency.sqs_list.outputs.queue_name]
  create_alarms     = true
}
