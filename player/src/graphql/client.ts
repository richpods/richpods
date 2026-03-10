import { getSdk } from "./generated";
import { GraphQLClient } from "graphql-request";

export const graphQLClient = new GraphQLClient(import.meta.env.VITE_GRAPHQL_ENDPOINT);
export const api = getSdk(graphQLClient);
