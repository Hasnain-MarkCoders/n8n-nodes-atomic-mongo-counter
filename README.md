# n8n-nodes-atomic-mongo-counter

An n8n community node for generating atomic, incremental integer counters using MongoDB.

## Features

- Uses MongoDB `$inc` for atomic counter updates
- Safe for concurrent workflow executions
- Reuses n8n-managed MongoDB credentials
- Configurable collection
- Configurable lookup field and value
- Configurable counter field
- Configurable increment amount
- Configurable output field
- Optional upsert support

## Example

Counter document:

```json
{
  "counter_name": "package_id_counter",
  "seq": 1000
}
```

Node configuration:

```text
Collection: counters
Lookup Field: counter_name
Lookup Value: package_id_counter
Counter Field: seq
Increment By: 1
Output Field: package_id
Upsert: false
```

Output:

```json
{
  "package_id": 1001
}
```

## MongoDB Index Recommendation

For the counter collection:

```javascript
db.counters.createIndex(
  { counter_name: 1 },
  { unique: true }
)
```

For the destination collection:

```javascript
db.forms.createIndex(
  { package_id: 1 },
  { unique: true }
)
```

## Credentials

This node uses the standard n8n MongoDB credential type.

Credentials are selected from the n8n UI and are not hardcoded in the workflow or node source.

## Installation

Install from n8n Community Nodes using:

```text
n8n-nodes-atomic-mongo-counter
```

## License

MIT
