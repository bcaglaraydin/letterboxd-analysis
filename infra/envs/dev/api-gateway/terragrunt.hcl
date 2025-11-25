include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules/api-gateway"
}

dependency "backend" {
  config_path = "../lambda"
}

inputs = {
  api_name             = "letterboxd-analysis-api-dev"
  lambda_invoke_arn    = dependency.backend.outputs.invoke_arn
  lambda_function_name = dependency.backend.outputs.function_name
}
