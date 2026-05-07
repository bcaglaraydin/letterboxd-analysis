include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "../../../modules/sqs"
}

inputs = {
  name = "list-scrape-queue-dev"
  visibility_timeout_seconds = 900 # 15 minutes for slow list scraping
  message_retention_seconds  = 86400
}
