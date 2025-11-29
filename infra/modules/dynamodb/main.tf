resource "aws_dynamodb_table" "this" {
  name         = var.table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = var.hash_key
  range_key    = var.range_key

  attribute {
    name = var.hash_key
    type = "S"
  }

  dynamic "attribute" {
    for_each = var.range_key != null ? [1] : []
    content {
      name = var.range_key
      type = "S"
    }
  }

  tags = {
    Name = var.table_name
  }

  ttl {
    attribute_name = var.ttl_attribute != null ? var.ttl_attribute : ""
    enabled        = var.ttl_attribute != null
  }
}
