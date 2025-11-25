remote_state {
  backend = "s3"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }
  config = {
    bucket         = "terraform-REDACTED_AWS_ACCOUNT_ID-state"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = "eu-west-1"
    encrypt        = true
  }
}

inputs = {
  aws_region = "eu-west-1"
  project_name = "letterboxd-analysis"
}
