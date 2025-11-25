include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules/s3"
}

inputs = {
  bucket_name     = "letterboxd-analysis-frontend-staging"
  website_enabled = true
}
