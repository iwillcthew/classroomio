import { classroomio, type InferResponseType, type InferRequestType } from '$lib/utils/services/api';

type LibraryRequest = typeof classroomio.organization.courses.recommended.$get;
type LibraryRequestQuery = InferRequestType<LibraryRequest>['query'];
export type LibraryQuery = Omit<LibraryRequestQuery, 'limit' | 'page'> & { limit?: number; page?: number };

export type GetPendingOrgInviteRequest = (typeof classroomio.invite.organization)['pending']['$get'];
type GetPendingOrgInviteResponse = Extract<InferResponseType<GetPendingOrgInviteRequest>, { success: true }>;
export type PendingOrgInvite = NonNullable<GetPendingOrgInviteResponse['data']>;
