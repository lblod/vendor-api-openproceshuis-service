# Vendor API

This JSON-ld api enables vendors to fully manage their process lifecycle within the OPH database. Endpoints support creating new processes, updating existing process metadata, and uploading corresponding process diagrams to ensure seamless integration and up-to-date documentation.

# Useful links

- [Swagger api documentation](https://dev.openproceshuis.lblod.info/api/docs/)
- [Datamodel](https://abb-vlaanderen.gitbook.io/informatie-oph/linked-datamodel/datamodel)

# Resources

**Process** Process resources can be created and edited through this API. We do limit editing processes by only allowing editing processes that have been created by this service.
**File** The file uris used for building up the process resource originate from the file-service

# Errors

Errors are create as resource objects of `oph:Error` type + the configured type. The type that you configure will be the one that triggers a delta message to interact with other services.

1. Update the environments of the service in your compose file

```yml
vendor-api:
  environment:
    ERROR_RESOURCE_TYPE_URI: 'http://open-services.net/ns/core#Error' # Same as the delta rule error-alert
    ERROR_GRAPH_URI: 'http://mu.semte.ch/graphs/integration/vendor-api/errors'
    ERROR_GRACE_PERIOD_IN_MINUTES: 1
    ERROR_THRESHOLD_OCCURRENCES: 1
    SEND_MAIL_ON_THRESHOLD: true # default is false
```

2. Update the authorization config to handle the new resource classes

```lisp
(define-prefixes
  :oph "http://lblod.data.gift/vocabularies/openproceshuis/"
  :os "http://open-services.net/ns/core#")

(define-graph error ("http://mu.semte.ch/graphs/errors")
  ("os:Error" -> _)
  ("oph:Error" -> _))
```

3. Make sure the app is up to date with the `loket-error-alert-service` & `deliver-email-service`

- https://github.com/lblod/loket-error-alert-service
- https://github.com/redpencilio/deliver-email-service
