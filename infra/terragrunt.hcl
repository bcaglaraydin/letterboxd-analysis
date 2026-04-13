locals {
  aws_region = "eu-west-1"
}

remote_state {
  backend = "s3"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }
  config = {
    bucket         = "terraform-${get_aws_account_id()}-state"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = local.aws_region
    encrypt        = true
  }
}

inputs = {
  aws_region = local.aws_region
  project_name = "letterboxd-analysis"
}
