remote_state {
  backend = "s3"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }
  config = {
    bucket         = "terraform-617969167018-state"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = "eu-west-1"
    encrypt        = true
    skip_bucket_root_access = true
    skip_bucket_enforced_tls = true
  }
}

inputs = {
  aws_region = "eu-west-1"
  project_name = "letterboxd-analysis"
}
