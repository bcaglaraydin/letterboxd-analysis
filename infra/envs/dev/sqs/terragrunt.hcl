include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "../../../modules/sqs"
}

inputs = {
  name = "film-scrape-queue-dev"
  visibility_timeout_seconds = 360
  message_retention_seconds  = 86400
}
