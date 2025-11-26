include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules/lambda"
}

inputs = {
  function_name = "letterboxd-analysis-backend-dev"
  handler       = "src/index.handler"
  environment_variables = {
    NODE_ENV = "development"
  }
  memory_size = 1536
  timeout     = 600
  runtime       = "nodejs18.x"
  source_dir    = "${get_terragrunt_dir()}/../../../../backend"
}
