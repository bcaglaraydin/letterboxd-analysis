include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules/lambda"
}

inputs = {
  function_name = "letterboxd-analysis-backend-dev"
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  source_dir    = "${get_terragrunt_dir()}/../../../../backend/src"
}
