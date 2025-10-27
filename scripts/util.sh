#!/bin/bash

mrep ()
{
	HAYSTACK="$1"
	NEEDLE="$2"
	REPLACE="$3"

	echo "${HAYSTACK//$NEEDLE/"$REPLACE"}"
}

mecho ()
{
	MSG="$1"

	MSG=$(mrep "$MSG" "<red>" "\033[31m")
	MSG=$(mrep "$MSG" "<green>" "\033[32m")
	MSG=$(mrep "$MSG" "<gold>" "\033[33m")
	MSG=$(mrep "$MSG" "<blue>" "\033[34m")
	MSG=$(mrep "$MSG" "<purple>" "\033[35m")
	MSG=$(mrep "$MSG" "<cyan>" "\033[36m")
	MSG=$(mrep "$MSG" "<gray>" "\033[37m")
	MSG=$(mrep "$MSG" "<white>" "\033[0m")
	MSG=$(mrep "$MSG" "<reset>" "\033[0m")

	printf "$MSG\033[0m\n"
}
