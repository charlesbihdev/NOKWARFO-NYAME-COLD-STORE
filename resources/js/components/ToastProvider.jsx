import { useEffect, useState } from "react";
import { BiCheckCircle, BiErrorCircle, BiX } from "react-icons/bi";
import { IoWarningOutline } from "react-icons/io5";
import { usePage } from "@inertiajs/react";

const Toast = ({ type, message }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [exit, setExit] = useState(false);

    useEffect(() => {
        if (message) {
            setIsVisible(true);
            const timer = setTimeout(() => {
                setExit(true);
                setTimeout(() => {
                    setIsVisible(false);
                    setExit(false);
                }, 300);
            }, 7000);

            return () => clearTimeout(timer);
        }
    }, [message]);

    if (!isVisible || !message) return null;

    const getIcon = () => {
        if (type === "success") {
            return <BiCheckCircle className="h-6 w-6 text-green-500" />;
        } else if (type === "error") {
            return <BiErrorCircle className="h-6 w-6 text-red-500" />;
        } else {
            return <IoWarningOutline className="h-6 w-6 text-yellow-400" />;
        }
    };

    return (
        <div
            className={`fixed top-4 right-4 z-50 transition-all duration-300 transform ${
                exit
                    ? "translate-x-full opacity-0"
                    : "translate-x-0 opacity-100"
            }`}
        >
            <div
                className={`w-80 rounded-lg shadow-lg border p-4 ${
                    type === "success"
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                }`}
            >
                <div className="flex items-start gap-2">
                    {getIcon()}
                    <div className="flex-1">
                        <h3
                            className={`text-sm font-semibold ${
                                type === "success"
                                    ? "text-green-800"
                                    : type === "error"
                                    ? "text-red-800"
                                    : "text-yellow-400" // For warning
                            }`}
                        >
                            {type === "success"
                                ? "Success"
                                : type === "error"
                                ? "Error"
                                : "Warning"}
                        </h3>
                        <p
                            className={`text-sm mt-1 ${
                                type === "success"
                                    ? "text-green-700"
                                    : type === "error"
                                    ? "text-red-700"
                                    : "text-yellow-700"
                            }`}
                        >
                            {message}
                        </p>
                    </div>
                    <button
                        onClick={() => setExit(true)}
                        className={`p-1 rounded-full hover:bg-opacity-20 ${
                            type === "success"
                                ? "hover:bg-green-200 text-green-700"
                                : type === "error"
                                ? "hover:bg-red-200 text-red-700"
                                : "hover:bg-yellow-200 text-yellow-700"
                        }`}
                    >
                        <BiX className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState({
        success: null,
        warning: null,
        error: null,
    });

    const flash = usePage().props.flash;

    const handleHide = (type) => {
        setToasts((prev) => ({
            ...prev,
            [type]: null,
        }));
    };

    useEffect(() => {
        // Force trigger even if the message is the same
        if (flash.success) {
            setToasts((prev) => ({
                ...prev,
                success: {
                    message: flash.success,
                    id: Date.now() + Math.random().toString(36).substr(2, 9), // Generate unique ID
                },
            }));
        }

        if (flash.error) {
            setToasts((prev) => ({
                ...prev,
                error: {
                    message: flash.error,
                    id: Date.now() + Math.random().toString(36).substr(2, 9), // Generate unique ID
                },
            }));
        }

        if (flash.warning) {
            setToasts((prev) => ({
                ...prev,
                warning: {
                    message: flash.warning,
                    id: Date.now() + Math.random().toString(36).substr(2, 9), // Generate unique ID
                },
            }));
        }
    }, [flash]);

    return (
        <>
            {toasts.success && (
                <Toast
                    key={toasts.success.id}
                    type="success"
                    message={toasts.success.message}
                    onHide={() => handleHide("success")}
                />
            )}
            {toasts.error && (
                <Toast
                    key={toasts.error.id}
                    type="error"
                    message={toasts.error.message}
                    onHide={() => handleHide("error")}
                />
            )}

            {toasts.warning && (
                <Toast
                    key={toasts.warning.id}
                    type="warning"
                    message={toasts.warning.message}
                    onHide={() => handleHide("warning")}
                />
            )}
            {children}
        </>
    );
};

export default ToastProvider; 