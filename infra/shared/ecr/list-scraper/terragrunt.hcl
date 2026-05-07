include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "../../../modules/ecr"
}

inputs = {
  repository_name = "letterboxd-list-scraper"
  environment = "shared"
  enable_lifecycle_policy = true
  max_image_count         = 2
}
