include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../../modules/dynamodb"
}

inputs = {
  table_name = "Films-dev"
  hash_key      = "slug"
  ttl_attribute = "ttl"
}
