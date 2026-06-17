import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from './index';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Post', 'Comment', 'Subscription', 'Me'],
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    register: builder.mutation({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
    }),
    getMe: builder.query({
      query: () => '/auth/me',
      providesTags: ['Me'],
    }),
    getPosts: builder.query({
      query: (params) => ({
        url: '/posts',
        params,
      }),
      providesTags: (result) =>
        result
          ? [...result.results.map(({ slug }: any) => ({ type: 'Post' as const, id: slug })), { type: 'Post', id: 'LIST' }]
          : [{ type: 'Post', id: 'LIST' }],
    }),
    getPostBySlug: builder.query({
      query: (slug) => `/posts/${slug}`,
      providesTags: (_result, _error, slug) => [{ type: 'Post', id: slug }],
    }),
    createPost: builder.mutation({
      query: (newPost) => ({
        url: '/posts',
        method: 'POST',
        body: newPost,
      }),
      invalidatesTags: [{ type: 'Post', id: 'LIST' }],
    }),
    updatePost: builder.mutation({
      query: ({ slug, ...patch }) => ({
        url: `/posts/${slug}`,
        method: 'PUT',
        body: patch,
      }),
      invalidatesTags: (_result, _error, { slug }) => [{ type: 'Post', id: slug }, { type: 'Post', id: 'LIST' }],
    }),
    createComment: builder.mutation({
      query: ({ slug, body }) => ({
        url: `/posts/${slug}/comments`,
        method: 'POST',
        body: { body },
      }),
      invalidatesTags: (_result, _error, { slug }) => [{ type: 'Post', id: slug }, 'Comment'],
    }),
    getComments: builder.query({
      query: ({ slug, page = 1 }) => `/posts/${slug}/comments?page=${page}`,
      providesTags: ['Comment'],
    }),
    getMyPosts: builder.query({
      query: (params) => ({
        url: '/me/posts',
        params,
      }),
      providesTags: ['Post'],
    }),
    getMySubscriptions: builder.query({
      query: () => '/me/subscriptions',
      providesTags: ['Subscription'],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetMeQuery,
  useGetPostsQuery,
  useGetPostBySlugQuery,
  useCreatePostMutation,
  useUpdatePostMutation,
  useCreateCommentMutation,
  useGetCommentsQuery,
  useGetMyPostsQuery,
  useGetMySubscriptionsQuery,
} = apiSlice;
