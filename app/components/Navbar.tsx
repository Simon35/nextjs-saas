"use client"
import { UserButton, useUser } from '@clerk/nextjs'
import { Layers } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect } from 'react'
import { checkAndAddUser } from '../action'

const Navbar = () => {
    const pathname = usePathname()
    const {user} = useUser()

    //tableau de liens
    const navLinks = [
        {
            href: "/",
            label: "Factures Simon"
        }
    ]

    useEffect(() => {
        // ca nous permet de vérifier l'adresse mail du nouveau user
        // on fait appel à la fonction
        if(user?.primaryEmailAddress?.emailAddress && user.fullName){
            checkAndAddUser(user?.primaryEmailAddress?.emailAddress,user.fullName)
        }
    }, [user])

    const isActiveLink = (href: string) =>
        pathname.replace(/\/$/, "") === href.replace(/\/$/, "");

    const renderLinks = (className: string) =>
        //itérer sur chaque élément des liens
        //la clé obligatoire pour le map et on affiche le label
        //touche 7 `` pour des classes dynamiques
        //on va vérifier si link est actif
        navLinks.map(({ href, label }) => {
            return <Link href={href} key={href}
                className={`btn-sm  ${className} ${isActiveLink(href) ? 'btn-accent' : ''}`}>
                {label}
            </Link>
        })

    return (
        // l.45 flex pour rendre les éléments cote à cote, space-x-4 : espace entre element
        <div className='border-b border-base-300 px-5 md:px-[10%] py-4'>
            <div className='flex justify-between items-center'>
                <div className='flex items-center'>
                    <div className='bg-accent-content text-accent rounded-full p-2'>
                        <Layers className='h-6 w-6' />
                    </div>
                        <span className='ml-3 font-bold text-2xl italic'>
                            In<span className='text-accent'>Voice</span>
                        </span>
                </div>
                {user?.primaryEmailAddress?.emailAddress}
                <div className='flex space-x-4 items-center'>
                    {renderLinks("btn")}
                    <UserButton />
                </div>
            </div>
        </div>
    )
}

export default Navbar