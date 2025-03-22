import Image from 'next/image';

export default function Footer() {
    return (
        <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
            <div className="container mx-auto px-4 py-6">
                <div className="flex flex-col md:flex-row justify-between items-center">
                    <div className="flex items-center mb-4 md:mb-0">
                        <Image
                            src="/images/logo.svg"
                            alt="Open Libra Logo"
                            width={24}
                            height={24}
                            className="mr-2"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            Open Libra Blockchain Explorer
                        </span>
                    </div>
                    <div className="flex space-x-4">
                        <a href="https://openlibra.io" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 dark:text-gray-400 hover:text-libra-coral">
                            Website
                        </a>
                        <a href="https://docs.openlibra.io" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 dark:text-gray-400 hover:text-libra-coral">
                            Docs
                        </a>
                        <a href="https://github.com/openlibra" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 dark:text-gray-400 hover:text-libra-coral">
                            GitHub
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
} 