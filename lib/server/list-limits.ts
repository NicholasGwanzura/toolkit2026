/**
 * Upper bound on rows a list endpoint returns in one response, so one request can never pull an
 * entire growing table into memory. The pages that use these lists still load them whole, so this
 * is a safety ceiling rather than pagination. Raise it only together with real paging.
 */
export const MAX_LIST_ROWS = 5000;
