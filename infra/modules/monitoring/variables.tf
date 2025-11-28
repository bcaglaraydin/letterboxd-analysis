variable "lambdas" {
  description = "Map of lambda configurations containing function_name and timeout"
  type = map(object({
    function_name = string
    timeout       = number
  }))
}

variable "api_gateway_names" {
  type = list(string)
}

variable "sqs_queue_names" {
  type = list(string)
}

variable "alarm_email" {
  type    = string
  default = null
}
