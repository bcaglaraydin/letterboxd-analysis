include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "../../../modules/s3"
}

dependency "cloudfront" {
  config_path = "../cloudfront"
  mock_outputs = {
    cloudfront_arn = "arn:aws:cloudfront::123456789012:distribution/ABC1234567890"
  }
}

inputs = {
  bucket_name                 = "letterboxd-analysis-frontend-dev"
  website_enabled             = true
  cloudfront_distribution_arn = dependency.cloudfront.outputs.cloudfront_arn
}
