include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules/s3"
}

inputs = {
  bucket_name     = "letterboxd-analysis-frontend-prod"
  website_enabled = true
}
