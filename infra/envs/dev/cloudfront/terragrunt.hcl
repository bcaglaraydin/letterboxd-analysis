include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules/cloudfront"
}

inputs = {
  # Hardcoded to break circular dependency
  s3_bucket_regional_domain_name = "letterboxd-analysis-frontend-dev.s3.eu-west-1.amazonaws.com"
  s3_origin_id                   = "S3-letterboxd-analysis-frontend-dev"
}
