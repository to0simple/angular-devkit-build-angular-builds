"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular-devkit/core");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const require_project_module_1 = require("../angular-cli-files/utilities/require-project-module");
const service_worker_1 = require("../angular-cli-files/utilities/service-worker");
class AppShellBuilder {
    constructor(context) {
        this.context = context;
    }
    run(builderConfig) {
        const options = builderConfig.options;
        return new rxjs_1.Observable(obs => {
            let success = true;
            const subscription = rxjs_1.merge(this.build(options.serverTarget, {}), 
            // Never run the browser target in watch mode.
            // If service worker is needed, it will be added in this.renderUniversal();
            this.build(options.browserTarget, { watch: false, serviceWorker: false })).subscribe((event) => {
                // TODO: once we support a better build event, add support for merging two event streams
                // together.
                success = success && event.success;
            }, error => {
                obs.error(error);
            }, () => {
                obs.next({ success });
                obs.complete();
            });
            // Allow subscriptions to us to unsubscribe from each builds at the same time.
            return () => subscription.unsubscribe();
        }).pipe(operators_1.switchMap(event => {
            if (!event.success) {
                return rxjs_1.of(event);
            }
            return this.renderUniversal(options);
        }));
    }
    build(targetString, overrides) {
        const architect = this.context.architect;
        const [project, target, configuration] = targetString.split(':');
        // Override browser build watch setting.
        const builderConfig = architect.getBuilderConfiguration({
            project,
            target,
            configuration,
            overrides,
        });
        return architect.run(builderConfig, this.context);
    }
    getServerModuleBundlePath(options) {
        const architect = this.context.architect;
        return new rxjs_1.Observable(obs => {
            if (options.appModuleBundle) {
                obs.next(core_1.join(this.context.workspace.root, options.appModuleBundle));
                return obs.complete();
            }
            else {
                const [project, target, configuration] = options.serverTarget.split(':');
                const builderConfig = architect.getBuilderConfiguration({
                    project,
                    target,
                    configuration,
                });
                return architect.getBuilderDescription(builderConfig).pipe(operators_1.concatMap(description => architect.validateBuilderOptions(builderConfig, description)), operators_1.switchMap(config => {
                    const outputPath = core_1.join(this.context.workspace.root, config.options.outputPath);
                    return this.context.host.list(outputPath).pipe(operators_1.switchMap(files => {
                        const re = /^main\.(?:[a-zA-Z0-9]{20}\.)?(?:bundle\.)?js$/;
                        const maybeMain = files.filter(x => re.test(x))[0];
                        if (!maybeMain) {
                            return rxjs_1.throwError(new Error('Could not find the main bundle.'));
                        }
                        else {
                            return rxjs_1.of(core_1.join(outputPath, maybeMain));
                        }
                    }));
                })).subscribe(obs);
            }
        });
    }
    getBrowserBuilderConfig(options) {
        const architect = this.context.architect;
        const [project, target, configuration] = options.browserTarget.split(':');
        const builderConfig = architect.getBuilderConfiguration({
            project,
            target,
            configuration,
        });
        return architect.getBuilderDescription(builderConfig).pipe(operators_1.concatMap(description => architect.validateBuilderOptions(builderConfig, description)));
    }
    renderUniversal(options) {
        let browserOptions;
        let projectRoot;
        return rxjs_1.forkJoin(this.getBrowserBuilderConfig(options).pipe(operators_1.switchMap(config => {
            browserOptions = config.options;
            projectRoot = core_1.resolve(this.context.workspace.root, config.root);
            const browserIndexOutputPath = core_1.join(core_1.normalize(browserOptions.outputPath), 'index.html');
            const path = core_1.join(this.context.workspace.root, browserIndexOutputPath);
            return this.context.host.read(path).pipe(operators_1.map(x => {
                return [browserIndexOutputPath, x];
            }));
        })), this.getServerModuleBundlePath(options)).pipe(operators_1.switchMap(([[browserIndexOutputPath, indexContent], serverBundlePath]) => {
            const root = this.context.workspace.root;
            require_project_module_1.requireProjectModule(core_1.getSystemPath(root), 'zone.js/dist/zone-node');
            const renderModuleFactory = require_project_module_1.requireProjectModule(core_1.getSystemPath(root), '@angular/platform-server').renderModuleFactory;
            const AppServerModuleNgFactory = require(core_1.getSystemPath(serverBundlePath)).AppServerModuleNgFactory;
            const indexHtml = core_1.virtualFs.fileBufferToString(indexContent);
            const outputIndexPath = core_1.join(root, options.outputIndexPath || browserIndexOutputPath);
            // Render to HTML and overwrite the client index file.
            return rxjs_1.from(renderModuleFactory(AppServerModuleNgFactory, {
                document: indexHtml,
                url: options.route,
            })
                .then((html) => {
                return this.context.host
                    .write(outputIndexPath, core_1.virtualFs.stringToFileBuffer(html))
                    .toPromise();
            })
                .then(() => {
                if (browserOptions.serviceWorker) {
                    return service_worker_1.augmentAppWithServiceWorker(this.context.host, root, projectRoot, core_1.join(root, browserOptions.outputPath), browserOptions.baseHref || '/', browserOptions.ngswConfigPath);
                }
            })
                .then(() => ({ success: true })));
        }));
    }
}
exports.AppShellBuilder = AppShellBuilder;
exports.default = AppShellBuilder;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2J1aWxkX2FuZ3VsYXIvc3JjL2FwcC1zaGVsbC9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQWFBLCtDQUFnRztBQUNoRywrQkFBeUU7QUFDekUsOENBQTJEO0FBQzNELGtHQUE2RjtBQUM3RixrRkFBNEY7QUFNNUY7SUFFRSxZQUFtQixPQUF1QjtRQUF2QixZQUFPLEdBQVAsT0FBTyxDQUFnQjtJQUFJLENBQUM7SUFFL0MsR0FBRyxDQUFDLGFBQStEO1FBQ2pFLE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUM7UUFFdEMsTUFBTSxDQUFDLElBQUksaUJBQVUsQ0FBYSxHQUFHLENBQUMsRUFBRTtZQUN0QyxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUM7WUFDbkIsTUFBTSxZQUFZLEdBQUcsWUFBSyxDQUN4QixJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDO1lBQ3BDLDhDQUE4QztZQUM5QywyRUFBMkU7WUFDM0UsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FDMUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxLQUFpQixFQUFFLEVBQUU7Z0JBQ2hDLHdGQUF3RjtnQkFDeEYsWUFBWTtnQkFDWixPQUFPLEdBQUcsT0FBTyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUM7WUFDckMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFO2dCQUNULEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDbkIsQ0FBQyxFQUFFLEdBQUcsRUFBRTtnQkFDTixHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztnQkFDdEIsR0FBRyxDQUFDLFFB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LENBQUM7Q0FDRjtBQXpLRCwwQ0F5S0M7QUFFRCxrQkFBZSxlQUFlLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge1xuICBCdWlsZEV2ZW50LFxuICBCdWlsZGVyLFxuICBCdWlsZGVyQ29uZmlndXJhdGlvbixcbiAgQnVpbGRlckNvbnRleHQsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3QnO1xuaW1wb3J0IHsgUGF0aCwgZ2V0U3lzdGVtUGF0aCwgam9pbiwgbm9ybWFsaXplLCByZXNvbHZlLCB2aXJ0dWFsRnMgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBPYnNlcnZhYmxlLCBmb3JrSm9pbiwgZnJvbSwgbWVyZ2UsIG9mLCB0aHJvd0Vycm9yIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBjb25jYXRNYXAsIG1hcCwgc3dpdGNoTWFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgcmVxdWlyZVByb2plY3RNb2R1bGUgfSBmcm9tICcuLi9hbmd1bGFyLWNsaS1maWxlcy91dGlsaXRpZXMvcmVxdWlyZS1wcm9qZWN0LW1vZHVsZSc7XG5pbXBvcnQgeyBhdWdtZW50QXBwV2l0aFNlcnZpY2VXb3JrZXIgfSBmcm9tICcuLi9hbmd1bGFyLWNsaS1maWxlcy91dGlsaXRpZXMvc2VydmljZS13b3JrZXInO1xuaW1wb3J0IHsgQnJvd3NlckJ1aWxkZXJTY2hlbWEgfSBmcm9tICcuLi9icm93c2VyL3NjaGVtYSc7XG5pbXBvcnQgeyBCdWlsZFdlYnBhY2tTZXJ2ZXJTY2hlbWEgfSBmcm9tICcuLi9zZXJ2ZXIvc2NoZW1hJztcbmltcG9ydCB7IEJ1aWxkV2VicGFja0FwcFNoZWxsU2NoZW1hIH0gZnJvbSAnLi9zY2hlbWEnO1xuXG5cbmV4cG9ydCBjbGFzcyBBcHBTaGVsbEJ1aWxkZXIgaW1wbGVtZW50cyBCdWlsZGVyPEJ1aWxkV2VicGFja0FwcFNoZWxsU2NoZW1hPiB7XG5cbiAgY29uc3RydWN0b3IocHVibGljIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0KSB7IH1cblxuICBydW4oYnVpbGRlckNvbmZpZzogQnVpbGRlckNvbmZpZ3VyYXRpb248QnVpbGRXZWJwYWNrQXBwU2hlbGxTY2hlbWE+KTogT2JzZXJ2YWJsZTxCdWlsZEV2ZW50PiB7XG4gICAgY29uc3Qgb3B0aW9ucyA9IGJ1aWxkZXJDb25maWcub3B0aW9ucztcblxuICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZTxCdWlsZEV2ZW50PihvYnMgPT4ge1xuICAgICAgbGV0IHN1Y2Nlc3MgPSB0cnVlO1xuICAgICAgY29uc3Qgc3Vic2NyaXB0aW9uID0gbWVyZ2UoXG4gICAgICAgIHRoaXMuYnVpbGQob3B0aW9ucy5zZXJ2ZXJUYXJnZXQsIHt9KSxcbiAgICAgICAgLy8gTmV2ZXIgcnVuIHRoZSBicm93c2VyIHRhcmdldCBpbiB3YXRjaCBtb2RlLlxuICAgICAgICAvLyBJZiBzZXJ2aWNlIHdvcmtlciBpcyBuZWVkZWQsIGl0IHdpbGwgYmUgYWRkZWQgaW4gdGhpcy5yZW5kZXJVbml2ZXJzYWwoKTtcbiAgICAgICAgdGhpcy5idWlsZChvcHRpb25zLmJyb3dzZXJUYXJnZXQsIHsgd2F0Y2g6IGZhbHNlLCBzZXJ2aWNlV29ya2VyOiBmYWxzZSB9KSxcbiAgICAgICkuc3Vic2NyaWJlKChldmVudDogQnVpbGRFdmVudCkgPT4ge1xuICAgICAgICAvLyBUT0RPOiBvbmNlIHdlIHN1cHBvcnQgYSBiZXR0ZXIgYnVpbGQgZXZlbnQsIGFkZCBzdXBwb3J0IGZvciBtZXJnaW5nIHR3byBldmVudCBzdHJlYW1zXG4gICAgICAgIC8vIHRvZ2V0aGVyLlxuICAgICAgICBzdWNjZXNzID0gc3VjY2VzcyAmJiBldmVudC5zdWNjZXNzO1xuICAgICAgfSwgZXJyb3IgPT4ge1xuICAgICAgICBvYnMuZXJyb3IoZXJyb3IpO1xuICAgICAgfSwgKCkgPT4ge1xuICAgICAgICBvYnMubmV4dCh7IHN1Y2Nlc3MgfSk7XG4gICAgICAgIG9icy5jb21wbGV0ZSgpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIEFsbG93IHN1YnNjcmlwdGlvbnMgdG8gdXMgdG8gdW5zdWJzY3JpYmUgZnJvbSBlYWNoIGJ1aWxkcyBhdCB0aGUgc2FtZSB0aW1lLlxuICAgICAgcmV0dXJuICgpID0+IHN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgIH0pLnBpcGUoXG4gICAgICBzd2l0Y2hNYXAoZXZlbnQgPT4ge1xuICAgICAgICBpZiAoIWV2ZW50LnN1Y2Nlc3MpIHtcbiAgICAgICAgICByZXR1cm4gb2YoZXZlbnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMucmVuZGVyVW5pdmVyc2FsKG9wdGlvbnMpO1xuICAgICAgfSksXG4gICAgKTtcbiAgfVxuXG4gIGJ1aWxkKHRhcmdldFN0cmluZzogc3RyaW5nLCBvdmVycmlkZXM6IHt9KSB7XG4gICAgY29uc3QgYXJjaGl0ZWN0ID0gdGhpcy5jb250ZXh0LmFyY2hpdGVjdDtcbiAgICBjb25zdCBbcHJvamVjdCwgdGFyZ2V0LCBjb25maWd1cmF0aW9uXSA9IHRhcmdldFN0cmluZy5zcGxpdCgnOicpO1xuXG4gICAgLy8gT3ZlcnJpZGUgYnJvd3NlciBidWlsZCB3YXRjaCBzZXR0aW5nLlxuICAgIGNvbnN0IGJ1aWxkZXJDb25maWcgPSBhcmNoaXRlY3QuZ2V0QnVpbGRlckNvbmZpZ3VyYXRpb248e30+KHtcbiAgICAgIHByb2plY3QsXG4gICAgICB0YXJnZXQsXG4gICAgICBjb25maWd1cmF0aW9uLFxuICAgICAgb3ZlcnJpZGVzLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGFyY2hpdGVjdC5ydW4oYnVpbGRlckNvbmZpZywgdGhpcy5jb250ZXh0KTtcbiAgfVxuXG4gIGdldFNlcnZlck1vZHVsZUJ1bmRsZVBhdGgob3B0aW9uczogQnVpbGRXZWJwYWNrQXBwU2hlbGxTY2hlbWEpIHtcbiAgICBjb25zdCBhcmNoaXRlY3QgPSB0aGlzLmNvbnRleHQuYXJjaGl0ZWN0O1xuXG4gICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPFBhdGg+KG9icyA9PiB7XG4gICAgICBpZiAob3B0aW9ucy5hcHBNb2R1bGVCdW5kbGUpIHtcbiAgICAgICAgb2JzLm5leHQoam9pbih0aGlzLmNvbnRleHQud29ya3NwYWNlLnJvb3QsIG9wdGlvbnMuYXBwTW9kdWxlQnVuZGxlKSk7XG5cbiAgICAgICAgcmV0dXJuIG9icy5jb21wbGV0ZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgW3Byb2plY3QsIHRhcmdldCwgY29uZmlndXJhdGlvbl0gPSBvcHRpb25zLnNlcnZlclRhcmdldC5zcGxpdCgnOicpO1xuICAgICAgICBjb25zdCBidWlsZGVyQ29uZmlnID0gYXJjaGl0ZWN0LmdldEJ1aWxkZXJDb25maWd1cmF0aW9uPEJ1aWxkV2VicGFja1NlcnZlclNjaGVtYT4oe1xuICAgICAgICAgIHByb2plY3QsXG4gICAgICAgICAgdGFyZ2V0LFxuICAgICAgICAgIGNvbmZpZ3VyYXRpb24sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBhcmNoaXRlY3QuZ2V0QnVpbGRlckRlc2NyaXB0aW9uKGJ1aWxkZXJDb25maWcpLnBpcGUoXG4gICAgICAgICAgY29uY2F0TWFwKGRlc2NyaXB0aW9uID0+IGFyY2hpdGVjdC52YWxpZGF0ZUJ1aWxkZXJPcHRpb25zKGJ1aWxkZXJDb25maWcsIGRlc2NyaXB0aW9uKSksXG4gICAgICAgICAgc3dpdGNoTWFwKGNvbmZpZyA9PiB7XG4gICAgICAgICAgICBjb25zdCBvdXRwdXRQYXRoID0gam9pbih0aGlzLmNvbnRleHQud29ya3NwYWNlLnJvb3QsIGNvbmZpZy5vcHRpb25zLm91dHB1dFBhdGgpO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb250ZXh0Lmhvc3QubGlzdChvdXRwdXRQYXRoKS5waXBlKFxuICAgICAgICAgICAgICBzd2l0Y2hNYXAoZmlsZXMgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlID0gL15tYWluXFwuKD86W2EtekEtWjAtOV17MjB9XFwuKT8oPzpidW5kbGVcXC4pP2pzJC87XG4gICAgICAgICAgICAgICAgY29uc3QgbWF5YmVNYWluID0gZmlsZXMuZmlsdGVyKHggPT4gcmUudGVzdCh4KSlbMF07XG5cbiAgICAgICAgICAgICAgICBpZiAoIW1heWJlTWFpbikge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHRocm93RXJyb3IobmV3IEVycm9yKCdDb3VsZCBub3QgZmluZCB0aGUgbWFpbiBidW5kbGUuJykpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gb2Yoam9pbihvdXRwdXRQYXRoLCBtYXliZU1haW4pKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9KSxcbiAgICAgICAgKS5zdWJzY3JpYmUob2JzKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGdldEJyb3dzZXJCdWlsZGVyQ29uZmlnKG9wdGlvbnM6IEJ1aWxkV2VicGFja0FwcFNoZWxsU2NoZW1hKSB7XG4gICAgY29uc3QgYXJjaGl0ZWN0ID0gdGhpcy5jb250ZXh0LmFyY2hpdGVjdDtcbiAgICBjb25zdCBbcHJvamVjdCwgdGFyZ2V0LCBjb25maWd1cmF0aW9uXSA9IG9wdGlvbnMuYnJvd3NlclRhcmdldC5zcGxpdCgnOicpO1xuICAgIGNvbnN0IGJ1aWxkZXJDb25maWcgPSBhcmNoaXRlY3QuZ2V0QnVpbGRlckNvbmZpZ3VyYXRpb248QnJvd3NlckJ1aWxkZXJTY2hlbWE+KHtcbiAgICAgIHByb2plY3QsXG4gICAgICB0YXJnZXQsXG4gICAgICBjb25maWd1cmF0aW9uLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGFyY2hpdGVjdC5nZXRCdWlsZGVyRGVzY3JpcHRpb24oYnVpbGRlckNvbmZpZykucGlwZShcbiAgICAgIGNvbmNhdE1hcChkZXNjcmlwdGlvbiA9PiBhcmNoaXRlY3QudmFsaWRhdGVCdWlsZGVyT3B0aW9ucyhidWlsZGVyQ29uZmlnLCBkZXNjcmlwdGlvbikpLFxuICAgICk7XG4gIH1cblxuICByZW5kZXJVbml2ZXJzYWwob3B0aW9uczogQnVpbGRXZWJwYWNrQXBwU2hlbGxTY2hlbWEpOiBPYnNlcnZhYmxlPEJ1aWxkRXZlbnQ+IHtcbiAgICBsZXQgYnJvd3Nlck9wdGlvbnM6IEJyb3dzZXJCdWlsZGVyU2NoZW1hO1xuICAgIGxldCBwcm9qZWN0Um9vdDogUGF0aDtcblxuICAgIHJldHVybiBmb3JrSm9pbihcbiAgICAgIHRoaXMuZ2V0QnJvd3NlckJ1aWxkZXJDb25maWcob3B0aW9ucykucGlwZShcbiAgICAgICAgc3dpdGNoTWFwKGNvbmZpZyA9PiB7XG4gICAgICAgICAgYnJvd3Nlck9wdGlvbnMgPSBjb25maWcub3B0aW9ucztcbiAgICAgICAgICBwcm9qZWN0Um9vdCA9IHJlc29sdmUodGhpcy5jb250ZXh0LndvcmtzcGFjZS5yb290LCBjb25maWcucm9vdCk7XG4gICAgICAgICAgY29uc3QgYnJvd3NlckluZGV4T3V0cHV0UGF0aCA9IGpvaW4obm9ybWFsaXplKGJyb3dzZXJPcHRpb25zLm91dHB1dFBhdGgpLCAnaW5kZXguaHRtbCcpO1xuICAgICAgICAgIGNvbnN0IHBhdGggPSBqb2luKHRoaXMuY29udGV4dC53b3Jrc3BhY2Uucm9vdCwgYnJvd3NlckluZGV4T3V0cHV0UGF0aCk7XG5cbiAgICAgICAgICByZXR1cm4gdGhpcy5jb250ZXh0Lmhvc3QucmVhZChwYXRoKS5waXBlKFxuICAgICAgICAgICAgbWFwPHZpcnR1YWxGcy5GaWxlQnVmZmVyLCBbUGF0aCwgdmlydHVhbEZzLkZpbGVCdWZmZXJdPih4ID0+IHtcbiAgICAgICAgICAgICAgcmV0dXJuIFticm93c2VySW5kZXhPdXRwdXRQYXRoLCB4XTtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICk7XG4gICAgICAgIH0pLFxuICAgICAgKSxcbiAgICAgIHRoaXMuZ2V0U2VydmVyTW9kdWxlQnVuZGxlUGF0aChvcHRpb25zKSxcbiAgICApLnBpcGUoXG4gICAgICBzd2l0Y2hNYXAoKFtbYnJvd3NlckluZGV4T3V0cHV0UGF0aCwgaW5kZXhDb250ZW50XSwgc2VydmVyQnVuZGxlUGF0aF0pID0+IHtcbiAgICAgICAgY29uc3Qgcm9vdCA9IHRoaXMuY29udGV4dC53b3Jrc3BhY2Uucm9vdDtcbiAgICAgICAgcmVxdWlyZVByb2plY3RNb2R1bGUoZ2V0U3lzdGVtUGF0aChyb290KSwgJ3pvbmUuanMvZGlzdC96b25lLW5vZGUnKTtcblxuICAgICAgICBjb25zdCByZW5kZXJNb2R1bGVGYWN0b3J5ID0gcmVxdWlyZVByb2plY3RNb2R1bGUoXG4gICAgICAgICAgZ2V0U3lzdGVtUGF0aChyb290KSxcbiAgICAgICAgICAnQGFuZ3VsYXIvcGxhdGZvcm0tc2VydmVyJyxcbiAgICAgICAgKS5yZW5kZXJNb2R1bGVGYWN0b3J5O1xuICAgICAgICBjb25zdCBBcHBTZXJ2ZXJNb2R1bGVOZ0ZhY3RvcnkgPSByZXF1aXJlKFxuICAgICAgICAgIGdldFN5c3RlbVBhdGgoc2VydmVyQnVuZGxlUGF0aCksXG4gICAgICAgICkuQXBwU2VydmVyTW9kdWxlTmdGYWN0b3J5O1xuICAgICAgICBjb25zdCBpbmRleEh0bWwgPSB2aXJ0dWFsRnMuZmlsZUJ1ZmZlclRvU3RyaW5nKGluZGV4Q29udGVudCk7XG4gICAgICAgIGNvbnN0IG91dHB1dEluZGV4UGF0aCA9IGpvaW4ocm9vdCwgb3B0aW9ucy5vdXRwdXRJbmRleFBhdGggfHwgYnJvd3NlckluZGV4T3V0cHV0UGF0aCk7XG5cbiAgICAgICAgLy8gUmVuZGVyIHRvIEhUTUwgYW5kIG92ZXJ3cml0ZSB0aGUgY2xpZW50IGluZGV4IGZpbGUuXG4gICAgICAgIHJldHVybiBmcm9tKFxuICAgICAgICAgIHJlbmRlck1vZHVsZUZhY3RvcnkoQXBwU2VydmVyTW9kdWxlTmdGYWN0b3J5LCB7XG4gICAgICAgICAgICBkb2N1bWVudDogaW5kZXhIdG1sLFxuICAgICAgICAgICAgdXJsOiBvcHRpb25zLnJvdXRlLFxuICAgICAgICAgIH0pXG4gICAgICAgICAgLnRoZW4oKGh0bWw6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29udGV4dC5ob3N0XG4gICAgICAgICAgICAgIC53cml0ZShvdXRwdXRJbmRleFBhdGgsIHZpcnR1YWxGcy5zdHJpbmdUb0ZpbGVCdWZmZXIoaHRtbCkpXG4gICAgICAgICAgICAgIC50b1Byb21pc2UoKTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICAgIGlmIChicm93c2VyT3B0aW9ucy5zZXJ2aWNlV29ya2VyKSB7XG4gICAgICAgICAgICAgIHJldHVybiBhdWdtZW50QXBwV2l0aFNlcnZpY2VXb3JrZXIoXG4gICAgICAgICAgICAgICAgdGhpcy5jb250ZXh0Lmhvc3QsXG4gICAgICAgICAgICAgICAgcm9vdCxcbiAgICAgICAgICAgICAgICBwcm9qZWN0Um9vdCxcbiAgICAgICAgICAgICAgICBqb2luKHJvb3QsIGJyb3dzZXJPcHRpb25zLm91dHB1dFBhdGgpLFxuICAgICAgICAgICAgICAgIGJyb3dzZXJPcHRpb25zLmJhc2VIcmVmIHx8ICcvJyxcbiAgICAgICAgICAgICAgICBicm93c2VyT3B0aW9ucy5uZ3N3Q29uZmlnUGF0aCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KVxuICAgICAgICAgIC50aGVuKCgpID0+ICh7IHN1Y2Nlc3M6IHRydWUgfSkpLFxuICAgICAgICApO1xuICAgICAgfSksXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBBcHBTaGVsbEJ1aWxkZXI7XG4iXX0=