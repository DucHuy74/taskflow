package com.xxxx.ddd.infrastructure.graphql.exception;

import com.xxxx.ddd.common.exception.ErrorCode;
import com.xxxx.dddd.domain.exception.AppException;
import graphql.GraphQLError;
import graphql.GraphqlErrorBuilder;
import graphql.schema.DataFetchingEnvironment;
import org.springframework.graphql.execution.DataFetcherExceptionResolverAdapter;
import org.springframework.graphql.execution.ErrorType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Maps application exceptions thrown by GraphQL resolvers to clean GraphQL errors instead of INTERNAL_ERROR.
 */
@Component
public class GraphQlExceptionResolver extends DataFetcherExceptionResolverAdapter {

    @Override
    protected GraphQLError resolveToSingleError(Throwable ex, DataFetchingEnvironment env) {
        if (ex instanceof IllegalArgumentException) {
            return GraphqlErrorBuilder.newError(env)
                    .errorType(ErrorType.BAD_REQUEST)
                    .message(ex.getMessage())
                    .extensions(Map.of("code", ErrorCode.INVALID_KEY.getCode()))
                    .build();
        }
        if (ex instanceof AppException appException) {
            ErrorCode errorCode = appException.getErrorCode();
            return GraphqlErrorBuilder.newError(env)
                    .errorType(toErrorType(errorCode))
                    .message(errorCode.getMessage())
                    .extensions(Map.of("code", errorCode.getCode()))
                    .build();
        }
        return null;
    }

    private ErrorType toErrorType(ErrorCode errorCode) {
        int status = errorCode.getStatusCode().value();
        if (status == HttpStatus.NOT_FOUND.value()) {
            return ErrorType.NOT_FOUND;
        }
        if (status == HttpStatus.UNAUTHORIZED.value()) {
            return ErrorType.UNAUTHORIZED;
        }
        if (status == HttpStatus.FORBIDDEN.value()) {
            return ErrorType.FORBIDDEN;
        }
        if (status >= 400 && status < 500) {
            return ErrorType.BAD_REQUEST;
        }
        return ErrorType.INTERNAL_ERROR;
    }
}
