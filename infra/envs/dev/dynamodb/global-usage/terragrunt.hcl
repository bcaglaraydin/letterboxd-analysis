include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../../modules/dynamodb"
}

inputs = {
  table_name = "letterboxd-analysis-global-usage-dev"
  hash_key   = "window_id" # DATE#2024-04-12
  ttl_attribute = "ttl"
}
