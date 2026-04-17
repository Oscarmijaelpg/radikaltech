import { jsx as _jsx } from "react/jsx-runtime";
import { Spinner } from '@radikal/ui';
export function RouteLoader() {
    return (_jsx("div", { className: "min-h-[50vh] grid place-items-center", children: _jsx(Spinner, { size: "lg" }) }));
}
