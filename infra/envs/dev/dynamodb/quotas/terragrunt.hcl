include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../../modules/dynamodb"
}

inputs = {
  table_name = "letterboxd-analysis-quotas-dev"
  hash_key   = "ip"
  range_key  = "window_id" # DATE#2024-04-12 or HOUR#2024-04-12-14
  ttl_attribute = "ttl"
}
