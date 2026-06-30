export function success(res, data = null, message = 'Operación exitosa', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    error: null,
    message,
  });
}

export function error(res, error = 'SERVER_ERROR', message = 'Error interno del servidor', statusCode = 500) {
  return res.status(statusCode).json({
    success: false,
    data: null,
    error,
    message,
  });
}

export function notFound(res, entity = 'Recurso') {
  return error(res, 'NOT_FOUND', `${entity} no encontrado`, 404);
}

export function badRequest(res, message = 'Solicitud inválida', error = 'BAD_REQUEST') {
  return error(res, error, message, 400);
}

export function unauthorized(res, message = 'No autorizado') {
  return error(res, 'UNAUTHORIZED', message, 401);
}

export function forbidden(res, message = 'Acceso denegado') {
  return error(res, 'FORBIDDEN', message, 403);
}

export function conflict(res, message = 'Conflicto con el estado actual', error = 'CONFLICT') {
  return error(res, error, message, 409);
}
