import {
	Service,
	ServiceOptions,
	ServiceConfiguration,
	DEFAULT_SERVICE_CONFIGURATION,
} from "./service";

export interface CombinedServiceConfiguration extends ServiceConfiguration {
	title?: string;
	description?: string;
	tags?: string[];
	version?: string;
}

export interface CombinedServiceOptions<TExtend = {}>
	extends ServiceOptions<TExtend> {
	children: Service<TExtend>[];
}

export const DEFAULT_COMBINED_SERVICE_CONFIGURATION = {
	...DEFAULT_SERVICE_CONFIGURATION,
	title: "",
	description: "",
	tags: [] as string[],
} as const;

export const isCombinedService = (
	service: Service | CombinedService
): service is CombinedService =>
	"children" in service && Array.isArray(service.children);

export class CombinedService<TExtend = {}> extends Service<TExtend> {
	children: Service<TExtend>[];

	constructor({ children, ...options }: CombinedServiceOptions<TExtend>) {
		super(options);
		this.children = children;
	}
}

/**
 * Utility method for creating a single Veritas Service out of many independent services.
 * Useful when spinning up many microservices as a monolithic gateway bound to a single port.
 *
 * This method skips the regular bind phase of each service and instead creates an independent
 * Router for each service on which that services middleware and individual controllers are mounted
 * and the appropriate prefix.
 */
export function combineServices<TExtend extends {}>(
	services: Service<TExtend>[],
	config: CombinedServiceConfiguration = DEFAULT_COMBINED_SERVICE_CONFIGURATION
): Service<TExtend> {
	const combinedService = new CombinedService<TExtend>({
		title: config.title,
		description: config.description,
		tags: config.tags,
		children: services,
	});

	for (const service of services) {
		service.config.cors = combinedService.config.cors;
		service.bind(combinedService.router, config);
	}

	return combinedService;
}
