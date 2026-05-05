include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../../modules/ecr"
}

inputs = {
  repository_name = "letterboxd-worker"
  environment = "shared"
  enable_lifecycle_policy = true
  max_image_count         = 2
}
