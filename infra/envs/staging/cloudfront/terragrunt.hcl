include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules/cloudfront"
}

dependency "s3" {
  config_path = "../s3"
}

inputs = {
  s3_bucket_website_endpoint = dependency.s3.outputs.website_endpoint
  s3_origin_id               = "S3-${dependency.s3.outputs.bucket_id}"
}
