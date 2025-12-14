import prisma from '../database/prisma.js';

class SearchService {
    constructor() { }
    async createSearch(id, userEmail, status, search_input) {
        try {
            const search = await prisma.search.create({
                data: {
                    id: id,
                    user_email: userEmail,
                    status: status,
                    search_input: search_input
                }
            });
            return search;
        } catch (error) {
            throw new Error(`Failed to create search: ${error.message}`);
        }
    }

    async getSearchById(id) {
        try {
            if (!id) {
                throw new Error('Search ID is required');
            }

            const search = await prisma.search.findUnique({
                where: { id }
            });

            if (!search) {
                return null;
            }

            return search;
        } catch (error) {
            throw new Error(`Failed to get search by id: ${error.message}`);
        }
    }

    async getHistory(userEmail) {
        try {
            const searches = await prisma.search.findMany({
                where: { user_email: userEmail },
                orderBy: { created_at: 'desc' }
            });
            return searches;
        } catch (error) {
            throw new Error(`Failed to get all searches: ${error.message}`);
        }
    }
}

const searchService = new SearchService();
export default searchService;

