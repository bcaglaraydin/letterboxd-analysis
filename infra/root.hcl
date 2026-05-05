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
    use_lockfile   = true

    skip_bucket_root_access        = true
    skip_bucket_enforced_tls       = true
    skip_bucket_ssencryption       = true
    skip_bucket_public_access_blocking = true
    skip_bucket_versioning         = true
  }
}

inputs = {
  aws_region = local.aws_region
  project_name = "letterboxd-analysis"
}
