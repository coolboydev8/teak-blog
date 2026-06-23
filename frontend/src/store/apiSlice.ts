import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { RootState } from './index';
import { setAccessToken, logOut } from './authSlice';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '/api',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

let refreshPromise: ReturnType<typeof rawBaseQuery> | null = null;

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  // Absolute session cap: never issue a request (or a refresh) past the deadline.
  const { sessionExpiry } = (api.getState() as RootState).auth;
  if (sessionExpiry && Date.now() > sessionExpiry) {
    api.dispatch(logOut());
    return { error: { status: 'CUSTOM_ERROR' as const, error: 'Session expired' } };
  }

  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    const { refreshToken } = (api.getState() as RootState).auth;
    if (!refreshToken) {
      api.dispatch(logOut());
      return result;
    }

    // Single-flight: concurrent 401s share one refresh request.
    if (!refreshPromise) {
      refreshPromise = rawBaseQuery(
        { url: '/auth/token/refresh', method: 'POST', body: { refresh: refreshToken } },
        api,
        extraOptions,
      );
    }
    const refreshResult = await refreshPromise;
    refreshPromise = null;

    const access = (refreshResult.data as { access?: string } | undefined)?.access;
    if (access) {
      // Renew only the access token — this must not extend the session window.
      api.dispatch(setAccessToken(access));
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      api.dispatch(logOut());
    }
  }

  return result;
};

interface PostCategory {
  id: number;
  name: string;
  slug: string;
}

export interface LibraryPost {
  id: number;
  uuid: string;
  slug: string;
  title: string;
  excerpt: string;
  status: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
  view_count: number;
  comment_count: number;
  read_time_minutes: number;
  author: {
    id: number;
    username: string;
    avatar?: string;
  };
  category?: PostCategory;
}

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Post', 'Comment', 'Subscription', 'Me', 'Webhook', 'Activity', 'Analytics', 'Taxonomy'],
  endpoints: (builder) => ({
    // --- Auth ---
    login: builder.mutation({
      query: (credentials) => ({ url: '/auth/login', method: 'POST', body: credentials }),
    }),
    register: builder.mutation({
      query: (userData) => ({ url: '/auth/register', method: 'POST', body: userData }),
    }),
    getMe: builder.query({
      query: () => '/auth/me',
      providesTags: ['Me'],
    }),
    updateProfile: builder.mutation({
      query: (patch) => ({ url: '/auth/me', method: 'PATCH', body: patch }),
      invalidatesTags: ['Me'],
    }),
    requestPasswordReset: builder.mutation({
      query: (body) => ({ url: '/auth/password/reset', method: 'POST', body }),
    }),
    confirmPasswordReset: builder.mutation({
      query: (body) => ({ url: '/auth/password/reset/confirm', method: 'POST', body }),
    }),

    // --- Posts ---
    getPosts: builder.query({
      query: (params) => ({ url: '/posts/', params }),
      providesTags: (result) =>
        result
          ? [...result.results.map(({ slug }: any) => ({ type: 'Post' as const, id: slug })), { type: 'Post', id: 'LIST' }]
          : [{ type: 'Post', id: 'LIST' }],
    }),
    getPostBySlug: builder.query({
      query: (slug) => `/posts/${slug}`,
      providesTags: (_result, _error, slug) => [{ type: 'Post', id: slug }],
    }),
    getPostById: builder.query({
      query: (id) => `/posts/id/${id}`,
      providesTags: (result) => (result ? [{ type: 'Post', id: result.slug }] : []),
    }),
    getPostStats: builder.query({
      // Fresh, no-view-bump detail for the author dashboard (vs getPostById,
      // which is the public review page and counts every read).
      query: (id) => `/posts/id/${id}/stats`,
      providesTags: (result) => (result ? [{ type: 'Post', id: result.slug }] : []),
    }),
    createPost: builder.mutation({
      query: (newPost) => ({ url: '/posts/', method: 'POST', body: newPost }),
      invalidatesTags: [{ type: 'Post', id: 'LIST' }],
    }),
    updatePost: builder.mutation({
      query: ({ slug, ...patch }) => ({ url: `/posts/${slug}`, method: 'PUT', body: patch }),
      invalidatesTags: (_r, _e, { slug }) => [{ type: 'Post', id: slug }, { type: 'Post', id: 'LIST' }],
    }),
    publishPost: builder.mutation({
      query: (slug) => ({ url: `/posts/${slug}/publish`, method: 'POST' }),
      invalidatesTags: (_r, _e, slug) => [{ type: 'Post', id: slug }, { type: 'Post', id: 'LIST' }, 'Analytics', 'Activity'],
    }),
    archivePost: builder.mutation({
      query: (slug) => ({ url: `/posts/${slug}/archive`, method: 'POST' }),
      invalidatesTags: (_r, _e, slug) => [{ type: 'Post', id: slug }, { type: 'Post', id: 'LIST' }],
    }),
    unpublishPost: builder.mutation({
      query: (slug) => ({ url: `/posts/${slug}/unpublish`, method: 'POST' }),
      invalidatesTags: (_r, _e, slug) => [{ type: 'Post', id: slug }, { type: 'Post', id: 'LIST' }, 'Analytics'],
    }),
    deletePost: builder.mutation({
      query: (slug) => ({ url: `/posts/${slug}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Post', id: 'LIST' }],
    }),
    getMyPosts: builder.query({
      query: (params) => ({ url: '/me/posts', params }),
      providesTags: (result) =>
        result
          ? [...result.results.map(({ slug }: any) => ({ type: 'Post' as const, id: slug })), { type: 'Post', id: 'LIST' }]
          : [{ type: 'Post', id: 'LIST' }],
    }),

    // --- Taxonomy ---
    getCategories: builder.query({
      query: () => '/categories',
      providesTags: ['Taxonomy'],
    }),
    getTags: builder.query({
      query: () => '/tags',
      providesTags: ['Taxonomy'],
    }),

    // --- Comments ---
    getComments: builder.query({
      query: ({ slug, page = 1 }) => `/posts/${slug}/comments?page=${page}`,
      providesTags: ['Comment'],
    }),
    createComment: builder.mutation({
      query: ({ slug, body }) => ({ url: `/posts/${slug}/comments`, method: 'POST', body: { body } }),
      invalidatesTags: (_r, _e, { slug }) => [{ type: 'Post', id: slug }, 'Comment'],
    }),
    getMyComments: builder.query({
      query: (params) => ({ url: '/me/comments', params }),
      providesTags: ['Comment'],
    }),
    moderateComment: builder.mutation({
      query: ({ id, status, reason = '' }) => ({
        url: `/comments/${id}/moderate`,
        method: 'PUT',
        body: { status, reason },
      }),
      invalidatesTags: ['Comment', 'Activity'],
    }),
    updateComment: builder.mutation({
      query: ({ id, body }) => ({ url: `/comments/${id}`, method: 'PUT', body: { body } }),
      invalidatesTags: ['Comment'],
    }),

    // --- Subscriptions ---
    getMySubscriptions: builder.query({
      query: () => '/me/subscriptions',
      providesTags: ['Subscription'],
    }),
    subscribe: builder.mutation({
      query: (body) => ({ url: '/subscriptions/', method: 'POST', body }),
      invalidatesTags: ['Subscription'],
    }),
    updateSubscription: builder.mutation({
      query: ({ id, ...patch }) => ({ url: `/subscriptions/${id}`, method: 'PATCH', body: patch }),
      invalidatesTags: ['Subscription'],
    }),
    unsubscribe: builder.mutation({
      query: (id) => ({ url: `/subscriptions/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Subscription'],
    }),

    // --- Webhooks ---
    getWebhooks: builder.query({
      query: () => '/webhooks/',
      providesTags: ['Webhook'],
    }),
    createWebhook: builder.mutation({
      query: (body) => ({ url: '/webhooks/', method: 'POST', body }),
      invalidatesTags: ['Webhook'],
    }),
    updateWebhook: builder.mutation({
      query: ({ id, ...patch }) => ({ url: `/webhooks/${id}`, method: 'PATCH', body: patch }),
      invalidatesTags: ['Webhook'],
    }),
    deleteWebhook: builder.mutation({
      query: (id) => ({ url: `/webhooks/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Webhook'],
    }),

    // --- Analytics & activity ---
    getAnalytics: builder.query({
      query: () => '/me/analytics',
      providesTags: ['Analytics'],
    }),
    getActivity: builder.query({
      query: (params) => ({ url: '/me/activity', params }),
      providesTags: ['Activity'],
    }),
    getNotifications: builder.query({
      query: () => '/me/notifications',
      providesTags: ['Activity'],
    }),
    markActivityRead: builder.mutation({
      query: () => ({ url: '/me/activity/read', method: 'POST' }),
      invalidatesTags: ['Activity'],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetMeQuery,
  useUpdateProfileMutation,
  useRequestPasswordResetMutation,
  useConfirmPasswordResetMutation,
  useGetPostsQuery,
  useGetPostBySlugQuery,
  useGetPostByIdQuery,
  useGetPostStatsQuery,
  useCreatePostMutation,
  useUpdatePostMutation,
  usePublishPostMutation,
  useArchivePostMutation,
  useUnpublishPostMutation,
  useDeletePostMutation,
  useGetMyPostsQuery,
  useGetCategoriesQuery,
  useGetTagsQuery,
  useGetCommentsQuery,
  useCreateCommentMutation,
  useGetMyCommentsQuery,
  useModerateCommentMutation,
  useUpdateCommentMutation,
  useGetMySubscriptionsQuery,
  useSubscribeMutation,
  useUpdateSubscriptionMutation,
  useUnsubscribeMutation,
  useGetWebhooksQuery,
  useCreateWebhookMutation,
  useUpdateWebhookMutation,
  useDeleteWebhookMutation,
  useGetAnalyticsQuery,
  useGetActivityQuery,
  useGetNotificationsQuery,
  useMarkActivityReadMutation,
} = apiSlice;
