type SessionShape = {
  user?: {
    id?: string;
    email?: string;
    name?: string;
  };
  session?: {
    id?: string;
  };
} | null;

const getSession = (): Promise<SessionShape> => Promise.resolve(null);

export const auth = {
  api: {
    getSession,
  },
};
