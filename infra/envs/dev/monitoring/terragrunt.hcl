include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules/monitoring"
}

dependency "lambda_backend" {
  config_path = "../lambda"
}

dependency "lambda_worker" {
  config_path = "../lambda-worker"
}

dependency "api_gateway" {
  config_path = "../api-gateway"
}

dependency "sqs" {
  config_path = "../sqs"
}

inputs = {
  lambdas = {
    backend = {
      function_name = dependency.lambda_backend.outputs.function_name
      timeout       = dependency.lambda_backend.outputs.timeout
    }
    worker = {
      function_name = dependency.lambda_worker.outputs.function_name
      timeout       = dependency.lambda_worker.outputs.timeout
    }
  }
  api_gateway_names = [dependency.api_gateway.outputs.api_name]
  sqs_queue_names   = [dependency.sqs.outputs.queue_name]
}
